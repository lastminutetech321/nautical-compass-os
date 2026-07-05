import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Bot, Plus, Play, CheckCircle, Clock, AlertTriangle, Loader2, Zap, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import moment from "moment";

const statusColor = {
  queued: "bg-slate-100 text-slate-700", assigned: "bg-blue-100 text-blue-700",
  in_progress: "bg-amber-100 text-amber-700", blocked: "bg-red-100 text-red-700",
  completed: "bg-emerald-100 text-emerald-700", failed: "bg-red-100 text-red-700",
  cancelled: "bg-slate-100 text-slate-400",
};
const taskTypeIcon = {
  analyze: "🔍", draft: "✍️", research: "📖", test: "🧪",
  organize: "🗂️", summarize: "📝", monitor: "👁️", report: "📊",
  escalate: "🚨", custom: "⚙️",
};

const emptyForm = { title:"", description:"", agent_name:"", task_type:"analyze", status:"queued", priority:"medium", estimated_hours:1, linked_entity_type:"", linked_entity_id:"" };

export default function AgentWorkQueue() {
  const [tasks, setTasks] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [agentFilter, setAgentFilter] = useState("all");

  const load = async () => {
    setLoading(true);
    const [t, a] = await Promise.all([
      base44.entities.AgentTask.list("-created_date", 200).catch(() => []),
      base44.entities.AgentProfile.list("-created_date", 100).catch(() => []),
    ]);
    setTasks(t); setAgents(a);
    if (t.length > 0 && !selected) setSelected(t[0]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    setSaving(true);
    const data = { ...form, estimated_hours: Number(form.estimated_hours) };
    if (editId) await base44.entities.AgentTask.update(editId, data);
    else await base44.entities.AgentTask.create(data);
    setSaving(false); setShowForm(false); setEditId(null); setForm(emptyForm); load();
  };

  const updateStatus = async (task, status) => {
    const update = { status };
    if (status === "in_progress") update.started_at = new Date().toISOString();
    if (status === "completed") update.completed_at = new Date().toISOString();
    await base44.entities.AgentTask.update(task.id, update);
    load();
  };

  const seedQueue = async () => {
    const samples = [
      { title: "Analyze NC Canon coverage gaps", description: "Review all Canon entries and identify missing legal authorities needed for JurisEngine.", agent_name: "Canon Librarian Agent", task_type: "analyze", status: "queued", priority: "critical", estimated_hours: 4 },
      { title: "Draft Canon entry for 42 U.S.C. § 1983", description: "Research and draft a complete Canon entry for the primary civil rights statute.", agent_name: "Canon Librarian Agent", task_type: "draft", status: "queued", priority: "critical", estimated_hours: 8 },
      { title: "Run JurisEngine test suite", description: "Execute all 10 standard JurisEngine test queries and document results.", agent_name: "JurisEngine QA Agent", task_type: "test", status: "queued", priority: "high", estimated_hours: 3 },
      { title: "Review pending ImprovementItems", description: "Analyze queued improvements, score by ROI and readiness impact.", agent_name: "Product Manager Agent", task_type: "analyze", status: "queued", priority: "high", estimated_hours: 2 },
      { title: "Summarize all open diagnostic issues", description: "Generate executive summary of all critical and high-severity issues.", agent_name: "Documentation Agent", task_type: "summarize", status: "queued", priority: "medium", estimated_hours: 1 },
      { title: "Audit evidence vault chain-of-custody", description: "Verify all evidence entries have proper integrity hashes and custody logs.", agent_name: "Evidence Vault Agent", task_type: "test", status: "queued", priority: "high", estimated_hours: 2 },
    ];
    await Promise.all(samples.map(s => base44.entities.AgentTask.create(s)));
    load();
  };

  const filtered = tasks.filter(t => {
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    if (agentFilter !== "all" && t.agent_name !== agentFilter) return false;
    return true;
  });

  const counts = { queued: tasks.filter(t=>t.status==="queued").length, in_progress: tasks.filter(t=>t.status==="in_progress").length, completed: tasks.filter(t=>t.status==="completed").length, blocked: tasks.filter(t=>t.status==="blocked").length };
  const agentNames = [...new Set(tasks.map(t => t.agent_name).filter(Boolean))];

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">NCOS · AI Workforce</p>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Bot className="w-6 h-6 text-primary" />Agent Work Queue
          </h1>
          <p className="text-sm text-muted-foreground">Dispatch, monitor, and track AI agent tasks</p>
        </div>
        <div className="flex gap-2">
          {tasks.length === 0 && (
            <Button size="sm" variant="outline" onClick={seedQueue} className="text-xs gap-1.5">
              <Zap className="w-3.5 h-3.5" />Seed Queue
            </Button>
          )}
          <Button onClick={() => { setForm(emptyForm); setEditId(null); setShowForm(true); }} className="gap-2">
            <Plus className="w-4 h-4" />Dispatch Task
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {[
          { label: "Queued", value: counts.queued, color: "text-slate-700" },
          { label: "In Progress", value: counts.in_progress, color: "text-amber-600" },
          { label: "Completed", value: counts.completed, color: "text-emerald-600" },
          { label: "Blocked", value: counts.blocked, color: counts.blocked > 0 ? "text-red-600" : "text-slate-400" },
        ].map(k => (
          <Card key={k.label} className="p-3 border border-border/60">
            <p className="text-xs text-muted-foreground mb-1">{k.label}</p>
            <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
          </Card>
        ))}
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-8 text-xs w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {["queued","assigned","in_progress","blocked","completed","failed","cancelled"].map(s=><SelectItem key={s} value={s} className="capitalize text-xs">{s.replace(/_/g," ")}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={agentFilter} onValueChange={setAgentFilter}>
          <SelectTrigger className="h-8 text-xs w-48"><SelectValue placeholder="All Agents" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Agents</SelectItem>
            {agentNames.map(n=><SelectItem key={n} value={n} className="text-xs">{n}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {tasks.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-xl">
          <Bot className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-30" />
          <p className="text-sm text-muted-foreground mb-3">No tasks in the queue yet.</p>
          <Button size="sm" onClick={seedQueue}>Seed Initial Agent Queue</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Task list */}
          <div className="lg:col-span-1 space-y-1.5 max-h-[calc(100vh-22rem)] overflow-y-auto pr-1">
            {filtered.map(task => (
              <button key={task.id} onClick={() => setSelected(task)}
                className={`w-full text-left p-3 rounded-lg border transition-all ${selected?.id === task.id ? "bg-primary/10 border-primary/30" : "border-border/40 hover:bg-muted"}`}>
                <div className="flex items-start gap-2">
                  <span className="text-base flex-shrink-0">{taskTypeIcon[task.task_type] || "⚙️"}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium line-clamp-2">{task.title}</p>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${statusColor[task.status]}`}>{task.status?.replace(/_/g," ")}</span>
                      <span className="text-[10px] text-muted-foreground">{task.agent_name || "Unassigned"}</span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Task detail */}
          {selected && (
            <div className="lg:col-span-2">
              <Card className="p-5 border border-border/60">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-xl">{taskTypeIcon[selected.task_type] || "⚙️"}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${statusColor[selected.status]}`}>{selected.status?.replace(/_/g," ")}</span>
                      <Badge variant="outline" className="text-[9px] capitalize">{selected.priority}</Badge>
                    </div>
                    <h2 className="text-sm font-bold leading-tight">{selected.title}</h2>
                    {selected.agent_name && <p className="text-xs text-muted-foreground mt-0.5">Agent: {selected.agent_name}</p>}
                  </div>
                  <Button size="sm" variant="outline" className="text-xs" onClick={() => { setForm({title:selected.title||"",description:selected.description||"",agent_name:selected.agent_name||"",task_type:selected.task_type||"analyze",status:selected.status||"queued",priority:selected.priority||"medium",estimated_hours:selected.estimated_hours||1,linked_entity_type:selected.linked_entity_type||"",linked_entity_id:selected.linked_entity_id||""}); setEditId(selected.id); setShowForm(true); }}>Edit</Button>
                </div>

                {selected.description && (
                  <div className="bg-muted rounded-lg p-3 text-sm mb-4 leading-relaxed">{selected.description}</div>
                )}

                <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm mb-4">
                  {[
                    ["Task Type", selected.task_type?.replace(/_/g," ")],
                    ["Est. Hours", selected.estimated_hours],
                    ["Started", selected.started_at ? moment(selected.started_at).format("MMM D, h:mm A") : null],
                    ["Completed", selected.completed_at ? moment(selected.completed_at).format("MMM D, h:mm A") : null],
                  ].filter(([,v]) => v).map(([k, v]) => (
                    <div key={k} className="flex justify-between border-b border-border/30 pb-1">
                      <dt className="text-muted-foreground capitalize">{k}</dt>
                      <dd className="font-medium">{v}</dd>
                    </div>
                  ))}
                </dl>

                {selected.result_summary && (
                  <div className="mb-4">
                    <p className="text-xs font-semibold text-muted-foreground uppercase mb-1.5">Result</p>
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded text-sm text-emerald-800">{selected.result_summary}</div>
                  </div>
                )}
                {selected.error_message && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">{selected.error_message}</div>
                )}

                {/* Action buttons */}
                <div className="flex gap-2 pt-3 border-t border-border/40 flex-wrap">
                  {selected.status === "queued" && <Button size="sm" className="text-xs gap-1.5" onClick={() => updateStatus(selected, "in_progress")}><Play className="w-3 h-3" />Start Task</Button>}
                  {selected.status === "in_progress" && <Button size="sm" className="text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700" onClick={() => updateStatus(selected, "completed")}><CheckCircle className="w-3 h-3" />Mark Complete</Button>}
                  {["queued","assigned","in_progress"].includes(selected.status) && <Button size="sm" variant="outline" className="text-xs" onClick={() => updateStatus(selected, "blocked")}>Mark Blocked</Button>}
                  {selected.status === "blocked" && <Button size="sm" variant="outline" className="text-xs" onClick={() => updateStatus(selected, "queued")}>Unblock</Button>}
                  {!["completed","cancelled"].includes(selected.status) && <Button size="sm" variant="ghost" className="text-xs text-red-600" onClick={() => updateStatus(selected, "cancelled")}>Cancel</Button>}
                </div>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Task" : "Dispatch Agent Task"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div><label className="text-xs font-semibold text-muted-foreground block mb-1">Task Title *</label><input className="w-full border rounded px-2.5 py-1.5 text-sm" value={form.title} onChange={e => setForm({...form,title:e.target.value})} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Assign To Agent</label>
                <Select value={form.agent_name} onValueChange={v => setForm({...form,agent_name:v})}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select agent" /></SelectTrigger>
                  <SelectContent>{agents.map(a=><SelectItem key={a.id} value={a.name} className="text-xs">{a.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Task Type</label>
                <Select value={form.task_type} onValueChange={v => setForm({...form,task_type:v})}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>{["analyze","draft","research","test","organize","summarize","monitor","report","escalate","custom"].map(t=><SelectItem key={t} value={t} className="capitalize text-xs">{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Priority</label>
                <Select value={form.priority} onValueChange={v => setForm({...form,priority:v})}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>{["low","medium","high","critical"].map(p=><SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><label className="text-xs font-semibold text-muted-foreground block mb-1">Est. Hours</label><input type="number" className="w-full border rounded px-2.5 py-1.5 text-sm" value={form.estimated_hours} onChange={e => setForm({...form,estimated_hours:e.target.value})} /></div>
            </div>
            <div><label className="text-xs font-semibold text-muted-foreground block mb-1">Description / Instructions</label><textarea className="w-full border rounded px-2.5 py-1.5 text-sm resize-none" rows={3} value={form.description} onChange={e => setForm({...form,description:e.target.value})} /></div>
            <div className="flex justify-end gap-2 pt-1">
              <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button size="sm" onClick={save} disabled={saving||!form.title}>
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
                {editId ? "Update Task" : "Dispatch Task"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}