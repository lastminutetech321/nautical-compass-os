import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  Layers, Plus, Edit2, CheckCircle, AlertTriangle, Calendar,
  ChevronRight, Flag, BarChart3, Loader2, GitBranch, Target
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

const sprintStatusColors = { planned: "bg-slate-100 text-slate-600", active: "bg-emerald-100 text-emerald-700", completed: "bg-blue-100 text-blue-700", cancelled: "bg-red-100 text-red-600" };
const epicStatusColors = { backlog: "bg-slate-100 text-slate-600", in_progress: "bg-amber-100 text-amber-700", done: "bg-emerald-100 text-emerald-700", cancelled: "bg-red-100 text-red-600" };
const issueTypeColors = { bug: "bg-red-50 text-red-700 border-red-200", feature: "bg-blue-50 text-blue-700 border-blue-200", task: "bg-slate-50 text-slate-600 border-slate-200", story: "bg-violet-50 text-violet-700 border-violet-200", blocker: "bg-red-100 text-red-800 border-red-300", security: "bg-orange-50 text-orange-700 border-orange-200", improvement: "bg-emerald-50 text-emerald-700 border-emerald-200" };

const emptySprintForm = { name: "", project_id: "", goal: "", start_date: "", end_date: "", status: "planned", capacity: 0 };
const emptyEpicForm = { title: "", description: "", project_id: "", status: "backlog", priority: "medium", start_date: "", target_date: "", owner: "", risk_level: "low", risk_notes: "" };
const emptyIssueForm = { title: "", description: "", project_id: "", issue_type: "task", status: "open", priority: "medium", estimate_hours: "", due_date: "", labels: "" };

export default function SprintBoard() {
  const [projects, setProjects] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [epics, setEpics] = useState([]);
  const [issues, setIssues] = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeProject, setActiveProject] = useState(null);
  const [sprintOpen, setSprintOpen] = useState(false);
  const [epicOpen, setEpicOpen] = useState(false);
  const [issueOpen, setIssueOpen] = useState(false);
  const [sprintForm, setSprintForm] = useState(emptySprintForm);
  const [epicForm, setEpicForm] = useState(emptyEpicForm);
  const [issueForm, setIssueForm] = useState(emptyIssueForm);
  const [saving, setSaving] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState(null);

  const load = async () => {
    setLoading(true);
    const [proj, sp, ep, iss, mil] = await Promise.all([
      base44.entities.Project.list("-created_date", 50).catch(() => []),
      base44.entities.Sprint.list("-created_date", 100).catch(() => []),
      base44.entities.Epic.list("-created_date", 100).catch(() => []),
      base44.entities.IssueTracker.list("-created_date", 200).catch(() => []),
      base44.entities.Milestone.list("-created_date", 100).catch(() => []),
    ]);
    setProjects(proj); setSprints(sp); setEpics(ep); setIssues(iss); setMilestones(mil);
    if (proj.length > 0 && !activeProject) setActiveProject(proj[0].id);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const projSprints = sprints.filter(s => s.project_id === activeProject);
  const projEpics = epics.filter(e => e.project_id === activeProject);
  const projIssues = issues.filter(i => i.project_id === activeProject);
  const projMilestones = milestones.filter(m => m.project_id === activeProject);

  const activeSprint = projSprints.find(s => s.status === "active");

  const saveSprint = async (e) => {
    e.preventDefault();
    setSaving(true);
    await base44.entities.Sprint.create({ ...sprintForm, project_id: activeProject || sprintForm.project_id, capacity: Number(sprintForm.capacity) });
    setSaving(false); setSprintOpen(false); setSprintForm(emptySprintForm); load();
  };

  const saveEpic = async (e) => {
    e.preventDefault();
    setSaving(true);
    await base44.entities.Epic.create({ ...epicForm, project_id: activeProject || epicForm.project_id });
    setSaving(false); setEpicOpen(false); setEpicForm(emptyEpicForm); load();
  };

  const saveIssue = async (e) => {
    e.preventDefault();
    setSaving(true);
    await base44.entities.IssueTracker.create({ ...issueForm, project_id: activeProject || issueForm.project_id, labels: issueForm.labels.split(",").map(s => s.trim()).filter(Boolean), estimate_hours: issueForm.estimate_hours ? Number(issueForm.estimate_hours) : undefined });
    setSaving(false); setIssueOpen(false); setIssueForm(emptyIssueForm); load();
  };

  const updateIssueStatus = async (issue, status) => {
    await base44.entities.IssueTracker.update(issue.id, { status });
    load();
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  const issueColumns = [
    { status: "open", label: "Open", color: "border-slate-300" },
    { status: "in_progress", label: "In Progress", color: "border-amber-300" },
    { status: "review", label: "Review", color: "border-blue-300" },
    { status: "resolved", label: "Resolved", color: "border-emerald-300" },
  ];

  return (
    <div>
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">NCOS · Build Studio</p>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Layers className="w-6 h-6 text-blue-500" />Sprint Board
          </h1>
          <p className="text-sm text-muted-foreground">{projSprints.length} sprints · {projEpics.length} epics · {projIssues.length} issues</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant="outline" onClick={() => setSprintOpen(true)}><Plus className="w-3.5 h-3.5 mr-1" />Sprint</Button>
          <Button size="sm" variant="outline" onClick={() => setEpicOpen(true)}><Plus className="w-3.5 h-3.5 mr-1" />Epic</Button>
          <Button size="sm" onClick={() => setIssueOpen(true)}><Plus className="w-4 h-4 mr-1.5" />Issue</Button>
        </div>
      </div>

      {/* Project selector */}
      {projects.length > 0 && (
        <div className="flex gap-2 mb-5 flex-wrap">
          {projects.map(p => (
            <button key={p.id} onClick={() => setActiveProject(p.id)} className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${activeProject === p.id ? "bg-primary text-white border-primary" : "border-border hover:bg-muted"}`}>
              {p.name}
            </button>
          ))}
        </div>
      )}

      <Tabs defaultValue="board">
        <TabsList className="mb-5">
          <TabsTrigger value="board">Issue Board</TabsTrigger>
          <TabsTrigger value="sprints">Sprints ({projSprints.length})</TabsTrigger>
          <TabsTrigger value="epics">Epics ({projEpics.length})</TabsTrigger>
          <TabsTrigger value="milestones">Milestones ({projMilestones.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="board">
          {/* Active sprint indicator */}
          {activeSprint && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2 mb-4 text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle className="w-3.5 h-3.5" />
              <strong>Active Sprint:</strong> {activeSprint.name} · {activeSprint.start_date} → {activeSprint.end_date}
              {activeSprint.goal && <span className="text-emerald-600">· Goal: {activeSprint.goal}</span>}
            </div>
          )}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {issueColumns.map(col => (
              <div key={col.status}>
                <div className={`flex items-center justify-between px-3 py-2 rounded-t-lg border-t-2 bg-muted/50 ${col.color}`}>
                  <p className="text-xs font-semibold uppercase tracking-wide">{col.label}</p>
                  <Badge variant="secondary" className="text-[10px]">{projIssues.filter(i => i.status === col.status).length}</Badge>
                </div>
                <div className="space-y-2 pt-2 min-h-32">
                  {projIssues.filter(i => i.status === col.status).map(issue => (
                    <Card key={issue.id} className="p-3 cursor-pointer hover:shadow-md transition-all border border-border/60" onClick={() => setSelectedIssue(issue)}>
                      <div className="flex items-start justify-between gap-1 mb-1">
                        <p className="text-xs font-medium line-clamp-2">{issue.title}</p>
                        {issue.risk_detected && <AlertTriangle className="w-3 h-3 text-red-500 flex-shrink-0" />}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        <Badge variant="outline" className={`text-[9px] border ${issueTypeColors[issue.issue_type] || ""}`}>{issue.issue_type}</Badge>
                        <Badge variant="outline" className="text-[9px]">{issue.priority}</Badge>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="sprints">
          {projSprints.length === 0 ? (
            <div className="text-center py-12"><Layers className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-30" /><p className="text-sm text-muted-foreground">No sprints yet. Create your first sprint.</p></div>
          ) : (
            <div className="space-y-3">
              {projSprints.map(sprint => {
                const sprintIssues = issues.filter(i => sprint.task_ids?.includes(i.id) || i.sprint_id === sprint.id);
                const done = sprintIssues.filter(i => ["resolved","closed"].includes(i.status)).length;
                const pct = sprintIssues.length ? Math.round(done / sprintIssues.length * 100) : 0;
                return (
                  <Card key={sprint.id} className="p-4 border border-border/60">
                    <div className="flex items-start justify-between mb-3 flex-wrap gap-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={`text-[10px] ${sprintStatusColors[sprint.status] || ""}`}>{sprint.status}</Badge>
                          <p className="font-semibold text-sm">{sprint.name}</p>
                        </div>
                        {sprint.goal && <p className="text-xs text-muted-foreground">{sprint.goal}</p>}
                      </div>
                      <div className="text-xs text-muted-foreground">{sprint.start_date} → {sprint.end_date}</div>
                    </div>
                    {sprintIssues.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                          <span>{done}/{sprintIssues.length} issues resolved</span>
                          <span>{pct}%</span>
                        </div>
                        <Progress value={pct} className="h-1.5" />
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="epics">
          {projEpics.length === 0 ? (
            <div className="text-center py-12"><Flag className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-30" /><p className="text-sm text-muted-foreground">No epics yet.</p></div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {projEpics.map(epic => (
                <Card key={epic.id} className="p-4 border border-border/60">
                  <div className="flex items-start justify-between mb-2 gap-2">
                    <p className="font-semibold text-sm">{epic.title}</p>
                    <div className="flex items-center gap-1">
                      <Badge className={`text-[10px] ${epicStatusColors[epic.status] || ""}`}>{epic.status}</Badge>
                      <Badge variant="outline" className="text-[10px]">{epic.priority}</Badge>
                    </div>
                  </div>
                  {epic.description && <p className="text-xs text-muted-foreground mb-3">{epic.description}</p>}
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span>Progress</span><span>{epic.completion_pct || 0}%</span>
                  </div>
                  <Progress value={epic.completion_pct || 0} className="h-1.5 mb-2" />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{epic.owner || "Unassigned"}</span>
                    <span>{epic.target_date || "No deadline"}</span>
                  </div>
                  {epic.risk_level !== "low" && (
                    <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700">
                      <AlertTriangle className="w-3 h-3 inline mr-1" />Risk: {epic.risk_level} — {epic.risk_notes}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="milestones">
          {projMilestones.length === 0 ? (
            <div className="text-center py-12"><Target className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-30" /><p className="text-sm text-muted-foreground">No milestones yet.</p></div>
          ) : (
            <div className="space-y-3">
              {projMilestones.map(m => (
                <Card key={m.id} className="p-4 border border-border/60 flex items-start gap-4">
                  <div className={`w-3 h-3 rounded-full mt-1 flex-shrink-0 ${m.status === "achieved" ? "bg-emerald-500" : m.status === "at_risk" ? "bg-red-500" : m.status === "missed" ? "bg-slate-400" : "bg-amber-400"}`} />
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <p className="font-semibold text-sm">{m.title}</p>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] capitalize">{m.status}</Badge>
                        {m.due_date && <span className="text-xs text-muted-foreground"><Calendar className="w-3 h-3 inline mr-1" />{m.due_date}</span>}
                      </div>
                    </div>
                    {m.description && <p className="text-xs text-muted-foreground mt-1">{m.description}</p>}
                    {m.release_notes && <p className="text-xs bg-muted p-2 rounded mt-2">{m.release_notes}</p>}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Issue detail dialog */}
      <Dialog open={!!selectedIssue} onOpenChange={() => setSelectedIssue(null)}>
        {selectedIssue && (
          <DialogContent className="sm:max-w-lg">
            <DialogHeader><DialogTitle>{selectedIssue.title}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className={`text-xs border ${issueTypeColors[selectedIssue.issue_type] || ""}`}>{selectedIssue.issue_type}</Badge>
                <Badge variant="outline" className="text-xs capitalize">{selectedIssue.priority}</Badge>
                <Badge variant="outline" className="text-xs capitalize">{selectedIssue.status}</Badge>
              </div>
              {selectedIssue.description && <p className="text-sm bg-muted p-3 rounded">{selectedIssue.description}</p>}
              {selectedIssue.risk_detected && (
                <div className="bg-red-50 border border-red-200 rounded p-2 text-xs text-red-700">
                  <AlertTriangle className="w-3 h-3 inline mr-1" /><strong>Risk Detected:</strong> {selectedIssue.risk_reason}
                </div>
              )}
              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                {selectedIssue.estimate_hours && <div><strong>Estimate:</strong> {selectedIssue.estimate_hours}h</div>}
                {selectedIssue.due_date && <div><strong>Due:</strong> {selectedIssue.due_date}</div>}
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2">Update Status</p>
                <div className="flex flex-wrap gap-2">
                  {["open","in_progress","review","resolved","closed"].map(s => (
                    <button key={s} onClick={() => { updateIssueStatus(selectedIssue, s); setSelectedIssue({...selectedIssue, status: s}); }} className={`px-2.5 py-1 rounded-full text-xs border transition-all ${selectedIssue.status === s ? "bg-primary text-white border-primary" : "border-border hover:bg-muted"}`}>{s}</button>
                  ))}
                </div>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* Sprint Form */}
      <Dialog open={sprintOpen} onOpenChange={setSprintOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>New Sprint</DialogTitle></DialogHeader>
          <form onSubmit={saveSprint} className="space-y-3">
            <div><Label>Sprint Name</Label><Input value={sprintForm.name} onChange={e => setSprintForm({...sprintForm, name: e.target.value})} required /></div>
            <div><Label>Goal</Label><Textarea value={sprintForm.goal} onChange={e => setSprintForm({...sprintForm, goal: e.target.value})} rows={2} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Start Date</Label><Input type="date" value={sprintForm.start_date} onChange={e => setSprintForm({...sprintForm, start_date: e.target.value})} /></div>
              <div><Label>End Date</Label><Input type="date" value={sprintForm.end_date} onChange={e => setSprintForm({...sprintForm, end_date: e.target.value})} /></div>
            </div>
            <div><Label>Capacity (hours)</Label><Input type="number" value={sprintForm.capacity} onChange={e => setSprintForm({...sprintForm, capacity: e.target.value})} /></div>
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setSprintOpen(false)}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? "Saving..." : "Create Sprint"}</Button></div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Epic Form */}
      <Dialog open={epicOpen} onOpenChange={setEpicOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>New Epic</DialogTitle></DialogHeader>
          <form onSubmit={saveEpic} className="space-y-3">
            <div><Label>Epic Title</Label><Input value={epicForm.title} onChange={e => setEpicForm({...epicForm, title: e.target.value})} required /></div>
            <div><Label>Description</Label><Textarea value={epicForm.description} onChange={e => setEpicForm({...epicForm, description: e.target.value})} rows={2} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Priority</Label>
                <Select value={epicForm.priority} onValueChange={v => setEpicForm({...epicForm, priority: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["low","medium","high","critical"].map(p => <SelectItem key={p} value={p}>{p.charAt(0).toUpperCase()+p.slice(1)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Risk Level</Label>
                <Select value={epicForm.risk_level} onValueChange={v => setEpicForm({...epicForm, risk_level: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["low","medium","high","critical"].map(p => <SelectItem key={p} value={p}>{p.charAt(0).toUpperCase()+p.slice(1)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Start Date</Label><Input type="date" value={epicForm.start_date} onChange={e => setEpicForm({...epicForm, start_date: e.target.value})} /></div>
              <div><Label>Target Date</Label><Input type="date" value={epicForm.target_date} onChange={e => setEpicForm({...epicForm, target_date: e.target.value})} /></div>
            </div>
            <div><Label>Owner</Label><Input value={epicForm.owner} onChange={e => setEpicForm({...epicForm, owner: e.target.value})} /></div>
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setEpicOpen(false)}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? "Saving..." : "Create Epic"}</Button></div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Issue Form */}
      <Dialog open={issueOpen} onOpenChange={setIssueOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>New Issue</DialogTitle></DialogHeader>
          <form onSubmit={saveIssue} className="space-y-3">
            <div><Label>Title</Label><Input value={issueForm.title} onChange={e => setIssueForm({...issueForm, title: e.target.value})} required /></div>
            <div><Label>Description</Label><Textarea value={issueForm.description} onChange={e => setIssueForm({...issueForm, description: e.target.value})} rows={2} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Type</Label>
                <Select value={issueForm.issue_type} onValueChange={v => setIssueForm({...issueForm, issue_type: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["bug","feature","task","story","improvement","security","blocker"].map(t => <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Priority</Label>
                <Select value={issueForm.priority} onValueChange={v => setIssueForm({...issueForm, priority: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["low","medium","high","critical"].map(p => <SelectItem key={p} value={p}>{p.charAt(0).toUpperCase()+p.slice(1)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Estimate (hours)</Label><Input type="number" value={issueForm.estimate_hours} onChange={e => setIssueForm({...issueForm, estimate_hours: e.target.value})} /></div>
              <div><Label>Due Date</Label><Input type="date" value={issueForm.due_date} onChange={e => setIssueForm({...issueForm, due_date: e.target.value})} /></div>
            </div>
            <div><Label>Labels (comma-separated)</Label><Input value={issueForm.labels} onChange={e => setIssueForm({...issueForm, labels: e.target.value})} /></div>
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setIssueOpen(false)}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? "Saving..." : "Create Issue"}</Button></div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}