import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  Plus, Edit2, AlertTriangle, CheckCircle, Clock, ChevronDown, ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReadinessDimensions, TaskCompletion, BlockedAlert, calcCompletion, calcOverallReadiness } from "@/components/readiness/ReadinessEngine";
import { RAIL_MODULES } from "@/components/readiness/RailReadiness";
import moment from "moment";

const RAILS = [
  { value: "platform",         label: "Platform / Core" },
  { value: "legal_rail",       label: "Legal Rail" },
  { value: "jurisengine",      label: "JurisEngine" },
  { value: "culture_rail",     label: "Culture Rail" },
  { value: "workforce_rail",   label: "Workforce Rail" },
  { value: "resource_compass", label: "Resource Compass" },
  { value: "nc_canon",         label: "NC Canon" },
  { value: "mission_control",  label: "Mission Control" },
  { value: "custom",           label: "Custom" },
];

const STATUS_COLORS = {
  not_started: "bg-slate-100 text-slate-600",
  in_progress: "bg-blue-100 text-blue-700",
  staging: "bg-amber-100 text-amber-700",
  deployed: "bg-emerald-100 text-emerald-700",
  passing: "bg-emerald-100 text-emerald-700",
  failing: "bg-red-100 text-red-700",
  live: "bg-emerald-100 text-emerald-700",
  complete: "bg-emerald-100 text-emerald-700",
  seeded: "bg-blue-100 text-blue-700",
  schema_defined: "bg-violet-100 text-violet-700",
  tested: "bg-blue-100 text-blue-700",
  canon_linked: "bg-violet-100 text-violet-700",
  prompts_written: "bg-amber-100 text-amber-700",
  broken: "bg-red-100 text-red-700",
};

const PRIORITY_COLORS = {
  critical: "text-red-600 border-red-200",
  high: "text-amber-600 border-amber-200",
  medium: "text-blue-600 border-blue-200",
  low: "text-slate-600 border-slate-200",
};

function pctColor(pct) {
  if (pct >= 80) return "text-emerald-600";
  if (pct >= 40) return "text-amber-600";
  return "text-red-500";
}

const emptyForm = {
  name: "", description: "", owner: "", rail: "platform", priority: "high",
  dependencies: "", required_tasks: "", completed_tasks: "",
  estimated_hours: "", estimated_finish_date: "",
  deployment_status: "not_started", testing_status: "not_started",
  production_status: "not_started", api_status: "not_started",
  database_status: "not_started", ai_status: "not_started",
  architecture_pct: 0, backend_pct: 0, database_pct: 0,
  ai_pct: 0, testing_pct: 0, documentation_pct: 0, deployment_pct: 0,
  notes: "", blocked_by: "", is_blocked: false,
};

export default function BuildRegistry() {
  const [builds, setBuilds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [railFilter, setRailFilter] = useState("all");

  const load = async () => {
    setLoading(true);
    const data = await base44.entities.BuildRegistry.list("-created_date", 200);
    setBuilds(data);
    if (data.length > 0 && !selected) setSelected(data[0]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (editing) {
      setForm({
        ...emptyForm,
        name: editing.name || "",
        description: editing.description || "",
        owner: editing.owner || "",
        rail: editing.rail || "platform",
        priority: editing.priority || "high",
        dependencies: (editing.dependencies || []).join("\n"),
        required_tasks: (editing.required_tasks || []).join("\n"),
        completed_tasks: (editing.completed_tasks || []).join("\n"),
        estimated_hours: editing.estimated_hours || "",
        estimated_finish_date: editing.estimated_finish_date || "",
        deployment_status: editing.deployment_status || "not_started",
        testing_status: editing.testing_status || "not_started",
        production_status: editing.production_status || "not_started",
        api_status: editing.api_status || "not_started",
        database_status: editing.database_status || "not_started",
        ai_status: editing.ai_status || "not_started",
        architecture_pct: editing.architecture_pct || 0,
        backend_pct: editing.backend_pct || 0,
        database_pct: editing.database_pct || 0,
        ai_pct: editing.ai_pct || 0,
        testing_pct: editing.testing_pct || 0,
        documentation_pct: editing.documentation_pct || 0,
        deployment_pct: editing.deployment_pct || 0,
        notes: editing.notes || "",
        blocked_by: (editing.blocked_by || []).join("\n"),
        is_blocked: editing.is_blocked || false,
      });
    } else {
      setForm(emptyForm);
    }
  }, [editing, formOpen]);

  // Auto-populate required_tasks from rail template when rail changes in form
  const handleRailChange = (val) => {
    const template = RAIL_MODULES[val] || [];
    setForm(f => ({
      ...f,
      rail: val,
      required_tasks: f.required_tasks || template.join("\n"),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const requiredArr = form.required_tasks.split("\n").map(s => s.trim()).filter(Boolean);
    const completedArr = form.completed_tasks.split("\n").map(s => s.trim()).filter(Boolean);
    // Auto-calculate overall pct from task completion
    const taskPct = requiredArr.length ? Math.round((completedArr.length / requiredArr.length) * 100) : 0;
    const data = {
      ...form,
      dependencies: form.dependencies.split("\n").map(s => s.trim()).filter(Boolean),
      required_tasks: requiredArr,
      completed_tasks: completedArr,
      blocked_by: form.blocked_by.split("\n").map(s => s.trim()).filter(Boolean),
      estimated_hours: form.estimated_hours ? Number(form.estimated_hours) : 0,
      architecture_pct: Number(form.architecture_pct),
      backend_pct: Number(form.backend_pct),
      database_pct: Number(form.database_pct),
      ai_pct: Number(form.ai_pct),
      testing_pct: Number(form.testing_pct),
      documentation_pct: Number(form.documentation_pct),
      deployment_pct: Number(form.deployment_pct),
    };
    let result;
    if (editing) {
      result = await base44.entities.BuildRegistry.update(editing.id, data);
    } else {
      result = await base44.entities.BuildRegistry.create(data);
    }
    setSaving(false);
    setFormOpen(false);
    setEditing(null);
    setSelected(result);
    load();
  };

  const filtered = railFilter === "all" ? builds : builds.filter(b => b.rail === railFilter);

  const totalPct = builds.length
    ? Math.round(builds.reduce((s, b) => s + calcCompletion(b.required_tasks, b.completed_tasks), 0) / builds.length)
    : 0;
  const blockedCount = builds.filter(b => b.is_blocked || (b.blocked_by || []).length > 0).length;
  const criticalCount = builds.filter(b => b.priority === "critical").length;

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">NCOS · Build Registry</p>
          <h1 className="text-2xl font-bold tracking-tight">Build Registry</h1>
          <p className="text-sm text-muted-foreground">
            {builds.length} builds tracked · {totalPct}% avg completion · {blockedCount} blocked
          </p>
        </div>
        <Button size="sm" onClick={() => { setEditing(null); setFormOpen(true); }}><Plus className="w-4 h-4 mr-1.5" />New Build</Button>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total Builds", value: builds.length, color: "text-blue-600 bg-blue-50" },
          { label: "Avg Completion", value: `${totalPct}%`, color: `${pctColor(totalPct)} bg-muted` },
          { label: "Blocked", value: blockedCount, color: blockedCount > 0 ? "text-red-600 bg-red-50" : "text-emerald-600 bg-emerald-50" },
          { label: "Critical Priority", value: criticalCount, color: criticalCount > 0 ? "text-amber-600 bg-amber-50" : "text-slate-600 bg-slate-50" },
        ].map(k => (
          <Card key={k.label} className="p-4 border border-border/60">
            <p className="text-xs text-muted-foreground">{k.label}</p>
            <p className={`text-2xl font-black mt-1 ${k.color.split(" ")[0]}`}>{k.value}</p>
          </Card>
        ))}
      </div>

      {/* Rail filter */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <button
          onClick={() => setRailFilter("all")}
          className={`px-3 py-1 text-xs rounded-full border transition-all ${railFilter === "all" ? "bg-primary text-white border-primary" : "border-border text-muted-foreground hover:border-primary"}`}
        >All</button>
        {RAILS.map(r => (
          <button
            key={r.value}
            onClick={() => setRailFilter(r.value)}
            className={`px-3 py-1 text-xs rounded-full border transition-all ${railFilter === r.value ? "bg-primary text-white border-primary" : "border-border text-muted-foreground hover:border-primary"}`}
          >{r.label}</button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground text-sm mb-3">No builds registered yet.</p>
          <Button size="sm" onClick={() => setFormOpen(true)}><Plus className="w-4 h-4 mr-1.5" />Register First Build</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Build list */}
          <div className="space-y-2 max-h-[calc(100vh-18rem)] overflow-y-auto pr-1">
            {filtered.map(b => {
              const pct = calcCompletion(b.required_tasks, b.completed_tasks);
              const overall = calcOverallReadiness(b);
              const blocked = b.is_blocked || (b.blocked_by || []).length > 0;
              return (
                <Card
                  key={b.id}
                  className={`p-3 cursor-pointer transition-all ${selected?.id === b.id ? "border-primary shadow-md" : "border-border/60 hover:shadow-sm"}`}
                  onClick={() => setSelected(b)}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-sm font-semibold truncate">{b.name}</p>
                    {blocked && <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />}
                  </div>
                  <p className="text-[10px] text-muted-foreground mb-2">{RAILS.find(r => r.value === b.rail)?.label || b.rail}</p>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] text-muted-foreground w-12">Tasks</span>
                      <Progress value={pct} className="flex-1 h-1" />
                      <span className={`text-[9px] font-bold ${pctColor(pct)}`}>{pct}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] text-muted-foreground w-12">Readiness</span>
                      <Progress value={overall} className="flex-1 h-1" />
                      <span className={`text-[9px] font-bold ${pctColor(overall)}`}>{overall}%</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    <Badge variant="outline" className={`text-[9px] ${PRIORITY_COLORS[b.priority] || ""}`}>{b.priority}</Badge>
                    <Badge className={`text-[9px] ${STATUS_COLORS[b.deployment_status] || ""}`}>{b.deployment_status?.replace(/_/g," ")}</Badge>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Detail panel */}
          {selected && (
            <div className="lg:col-span-2">
              <Card className="p-5 border border-border/60">
                <div className="flex items-start justify-between mb-4 flex-wrap gap-2">
                  <div>
                    <h2 className="text-base font-semibold">{selected.name}</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {RAILS.find(r => r.value === selected.rail)?.label} · Owner: {selected.owner || "—"} · Est. {selected.estimated_hours || 0}h
                    </p>
                  </div>
                  <div className="flex gap-2 items-center">
                    <Badge variant="outline" className={`text-xs ${PRIORITY_COLORS[selected.priority] || ""}`}>{selected.priority}</Badge>
                    {selected.estimated_finish_date && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />{moment(selected.estimated_finish_date).format("MMM D, YYYY")}
                      </span>
                    )}
                    <Button size="sm" variant="outline" onClick={() => { setEditing(selected); setFormOpen(true); }}><Edit2 className="w-3.5 h-3.5" /></Button>
                  </div>
                </div>

                <BlockedAlert build={selected} />

                <Tabs defaultValue="tasks" className="mt-4">
                  <TabsList className="mb-4 flex-wrap h-auto">
                    <TabsTrigger value="tasks">Tasks</TabsTrigger>
                    <TabsTrigger value="readiness">Readiness</TabsTrigger>
                    <TabsTrigger value="status">Status</TabsTrigger>
                    <TabsTrigger value="deps">Dependencies</TabsTrigger>
                  </TabsList>

                  <TabsContent value="tasks">
                    <TaskCompletion
                      required={selected.required_tasks || []}
                      completed={selected.completed_tasks || []}
                    />
                  </TabsContent>

                  <TabsContent value="readiness">
                    <ReadinessDimensions build={selected} />
                  </TabsContent>

                  <TabsContent value="status">
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: "Deployment",   val: selected.deployment_status },
                        { label: "Testing",      val: selected.testing_status },
                        { label: "Production",   val: selected.production_status },
                        { label: "API",          val: selected.api_status },
                        { label: "Database",     val: selected.database_status },
                        { label: "AI",           val: selected.ai_status },
                      ].map(s => (
                        <div key={s.label} className="flex items-center justify-between p-2.5 rounded-lg border border-border/40">
                          <p className="text-xs text-muted-foreground">{s.label}</p>
                          <Badge className={`text-[10px] ${STATUS_COLORS[s.val] || "bg-slate-100 text-slate-600"}`}>
                            {s.val?.replace(/_/g," ") || "—"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                    {selected.notes && (
                      <div className="mt-4 bg-muted p-3 rounded-lg text-sm whitespace-pre-wrap">{selected.notes}</div>
                    )}
                  </TabsContent>

                  <TabsContent value="deps">
                    {(selected.dependencies || []).length === 0 ? (
                      <p className="text-sm text-muted-foreground">No dependencies registered.</p>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Depends On</p>
                        {selected.dependencies.map(d => (
                          <div key={d} className="flex items-center gap-2 p-2 rounded-lg border border-border/40">
                            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                            <p className="text-sm">{d}</p>
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

      {/* Form dialog */}
      <Dialog open={formOpen} onOpenChange={v => { setFormOpen(v); if (!v) setEditing(null); }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Build" : "Register Build"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Build Name</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required /></div>
              <div><Label>Owner</Label><Input value={form.owner} onChange={e => setForm({...form, owner: e.target.value})} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Rail / System</Label>
                <Select value={form.rail} onValueChange={handleRailChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{RAILS.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Priority</Label>
                <Select value={form.priority} onValueChange={v => setForm({...form, priority: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["critical","high","medium","low"].map(p => <SelectItem key={p} value={p}>{p.charAt(0).toUpperCase()+p.slice(1)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={2} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Required Tasks (one per line)</Label><Textarea value={form.required_tasks} onChange={e => setForm({...form, required_tasks: e.target.value})} rows={6} className="text-xs font-mono" /></div>
              <div><Label>Completed Tasks (one per line)</Label><Textarea value={form.completed_tasks} onChange={e => setForm({...form, completed_tasks: e.target.value})} rows={6} className="text-xs font-mono" /></div>
            </div>
            <div><Label>Dependencies (one per line)</Label><Textarea value={form.dependencies} onChange={e => setForm({...form, dependencies: e.target.value})} rows={2} placeholder="NC Canon&#10;Evidence Vault" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Est. Hours</Label><Input type="number" value={form.estimated_hours} onChange={e => setForm({...form, estimated_hours: e.target.value})} /></div>
              <div><Label>Est. Finish Date</Label><Input type="date" value={form.estimated_finish_date} onChange={e => setForm({...form, estimated_finish_date: e.target.value})} /></div>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground">
              <p className="font-semibold text-foreground mb-1">Readiness is auto-calculated</p>
              Dimension percentages are derived automatically from completed vs. required tasks. Task keywords (e.g. "[ai]", "[db]", "deploy", "test") determine which dimension each task contributes to.
            </div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status Fields</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: "deployment_status", label: "Deployment", opts: ["not_started","in_progress","staging","deployed"] },
                { key: "testing_status",    label: "Testing",    opts: ["not_started","in_progress","passing","failing"] },
                { key: "production_status", label: "Production", opts: ["not_started","in_progress","live","deprecated"] },
                { key: "api_status",        label: "API",        opts: ["not_started","in_progress","complete","broken"] },
                { key: "database_status",   label: "Database",   opts: ["not_started","schema_defined","seeded","complete"] },
                { key: "ai_status",         label: "AI",         opts: ["not_started","canon_linked","prompts_written","tested","complete"] },
              ].map(f => (
                <div key={f.key}>
                  <Label>{f.label} Status</Label>
                  <Select value={form[f.key]} onValueChange={v => setForm({...form, [f.key]: v})}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{f.opts.map(o => <SelectItem key={o} value={o}>{o.replace(/_/g," ")}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              ))}
            </div>
            <div>
              <Label>Blocked By (one per line)</Label>
              <Textarea value={form.blocked_by} onChange={e => setForm({...form, blocked_by: e.target.value})} rows={2} placeholder="NC Canon&#10;JurisEngine" />
            </div>
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={3} /></div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => { setFormOpen(false); setEditing(null); }}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? "Saving..." : editing ? "Update" : "Register"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}