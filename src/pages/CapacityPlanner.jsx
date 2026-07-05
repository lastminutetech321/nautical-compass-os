import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  Users, BarChart2, Zap, Clock, AlertTriangle, CheckCircle,
  TrendingUp, Activity, Sparkles, Loader2
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import moment from "moment";

function pctColor(v) { return v >= 75 ? "text-emerald-600" : v >= 40 ? "text-amber-600" : "text-red-500"; }

export default function CapacityPlanner() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [report, setReport] = useState(null);

  useEffect(() => {
    Promise.all([
      base44.entities.AgentProfile.list("-created_date", 100).catch(() => []),
      base44.entities.AgentTask.list("-created_date", 200).catch(() => []),
      base44.entities.Sprint.list("-created_date", 50).catch(() => []),
      base44.entities.BuildRegistry.list("-created_date", 200).catch(() => []),
      base44.entities.IssueTracker.list("-created_date", 200).catch(() => []),
      base44.entities.Task.list("-created_date", 200).catch(() => []),
    ]).then(([agents, agentTasks, sprints, builds, issues, tasks]) => {
      setData({ agents, agentTasks, sprints, builds, issues, tasks });
      setLoading(false);
    });
  }, []);

  const generateReport = async () => {
    if (!data) return;
    setGenerating(true);
    const { agents, agentTasks, sprints, builds, issues, tasks } = data;
    const activeSprint = sprints.find(s => s.status === "active");
    const openTasks = tasks.filter(t => t.status !== "done");
    const openIssues = issues.filter(i => !["resolved","closed"].includes(i.status));
    const blockedBuilds = builds.filter(b => b.is_blocked || (b.blocked_by||[]).length > 0);
    const agentUtilization = agents.map(a => {
      const myTasks = agentTasks.filter(t => t.agent_name === a.name && ["queued","in_progress"].includes(t.status));
      return { name: a.name, type: a.agent_type, status: a.status, load: myTasks.length, completed: a.tasks_completed || 0 };
    });

    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `You are the NCOS Capacity Planning Engine. Analyze current engineering capacity and produce allocation recommendations.

AGENTS (${agents.length} total):
${agentUtilization.map(a => `- ${a.name} (${a.type}): ${a.load} queued tasks, ${a.completed} completed, status: ${a.status}`).join("\n")}

CURRENT SPRINT: ${activeSprint ? `${activeSprint.name} (${activeSprint.start_date} → ${activeSprint.end_date})` : "No active sprint"}

OPEN WORK:
- Open tasks: ${openTasks.length} (${openTasks.filter(t=>t.priority==="critical").length} critical)
- Open issues: ${openIssues.length} (${openIssues.filter(i=>i.priority==="critical").length} critical, ${openIssues.filter(i=>i.issue_type==="bug").length} bugs)
- Blocked builds: ${blockedBuilds.length}
- Queued agent tasks: ${agentTasks.filter(t=>t.status==="queued").length}

Provide:
1. capacity_summary: Overall assessment of current capacity vs. workload
2. overloaded_agents: Array of agent names with too much queued work
3. underutilized_agents: Array of agent names that should take more work  
4. recommended_reassignments: Array of {from_agent, to_agent, task_type, reason}
5. sprint_feasibility: Can current sprint goals be achieved with current capacity?
6. velocity_estimate: Estimated tasks completable per week at current capacity
7. bottlenecks: Array of identified bottlenecks blocking throughput
8. recommended_next_sprint_focus: Array of recommended focus areas for next sprint
9. hiring_gaps: Types of agents/capabilities that would unlock the most throughput`,
      response_json_schema: {
        type: "object",
        properties: {
          capacity_summary: { type: "string" },
          overloaded_agents: { type: "array", items: { type: "string" } },
          underutilized_agents: { type: "array", items: { type: "string" } },
          recommended_reassignments: { type: "array", items: { type: "object", properties: { from_agent: { type: "string" }, to_agent: { type: "string" }, task_type: { type: "string" }, reason: { type: "string" } } } },
          sprint_feasibility: { type: "string" },
          velocity_estimate: { type: "number" },
          bottlenecks: { type: "array", items: { type: "string" } },
          recommended_next_sprint_focus: { type: "array", items: { type: "string" } },
          hiring_gaps: { type: "array", items: { type: "string" } }
        },
        required: ["capacity_summary", "bottlenecks", "sprint_feasibility"]
      }
    });
    setReport(res);
    setGenerating(false);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  const { agents, agentTasks, sprints, builds, issues, tasks } = data;
  const activeSprint = sprints.find(s => s.status === "active");
  const openTasks = tasks.filter(t => t.status !== "done");
  const activeAgents = agents.filter(a => a.status === "active");
  const idleAgents = agents.filter(a => a.status === "idle");
  const totalQueued = agentTasks.filter(t => t.status === "queued").length;
  const totalInProgress = agentTasks.filter(t => t.status === "in_progress").length;

  const agentRows = agents.map(a => {
    const myTasks = agentTasks.filter(t => t.agent_name === a.name);
    const queued = myTasks.filter(t => t.status === "queued").length;
    const inProg = myTasks.filter(t => t.status === "in_progress").length;
    const done = a.tasks_completed || 0;
    const load = queued + inProg;
    return { ...a, queued, inProg, done, load };
  }).sort((a, b) => b.load - a.load);

  const completedSprints = sprints.filter(s => s.status === "completed");
  const avgVelocity = completedSprints.length > 0
    ? Math.round(completedSprints.reduce((s, sp) => s + (sp.velocity || 0), 0) / completedSprints.length)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">NCOS · Engineering OS</p>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-violet-500" />Capacity Planner
          </h1>
          <p className="text-sm text-muted-foreground">{agents.length} agents · {totalQueued} tasks queued · {totalInProgress} in progress</p>
        </div>
        <Button onClick={generateReport} disabled={generating} className="gap-2">
          {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {generating ? "Analyzing..." : "Generate Capacity Report"}
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Active Agents", value: activeAgents.length, sub: `${idleAgents.length} idle`, color: "text-emerald-600 bg-emerald-50", icon: Users },
          { label: "Queued Tasks", value: totalQueued, sub: `${totalInProgress} in progress`, color: "text-amber-600 bg-amber-50", icon: Clock },
          { label: "Open Work Items", value: openTasks.length + issues.filter(i=>!["resolved","closed"].includes(i.status)).length, sub: "tasks + issues", color: "text-blue-600 bg-blue-50", icon: Activity },
          { label: "Sprint Velocity", value: avgVelocity > 0 ? avgVelocity : "—", sub: avgVelocity > 0 ? "avg tasks/sprint" : "no completed sprints", color: "text-violet-600 bg-violet-50", icon: TrendingUp },
        ].map(k => (
          <Card key={k.label} className="p-4 border border-border/60">
            <div className="flex items-center gap-2 mb-1">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${k.color}`}><k.icon className="w-4 h-4" /></div>
              <p className="text-xs text-muted-foreground">{k.label}</p>
            </div>
            <p className={`text-xl font-bold pl-10 ${k.color.split(" ")[0]}`}>{k.value}</p>
            <p className="text-[10px] text-muted-foreground pl-10">{k.sub}</p>
          </Card>
        ))}
      </div>

      {activeSprint && (
        <Card className="p-4 border border-emerald-200 bg-emerald-50">
          <p className="text-xs font-bold text-emerald-700 uppercase tracking-wide mb-1 flex items-center gap-1.5"><Zap className="w-3.5 h-3.5" />Active Sprint</p>
          <p className="text-sm font-semibold text-emerald-800">{activeSprint.name}</p>
          <p className="text-xs text-emerald-700">{activeSprint.start_date} → {activeSprint.end_date} · {activeSprint.goal || "No goal set"}</p>
          {activeSprint.capacity > 0 && (
            <div className="mt-2">
              <div className="flex justify-between text-xs text-emerald-700 mb-1">
                <span>Capacity utilization</span>
                <span>{Math.min(100, Math.round((totalInProgress / activeSprint.capacity) * 100))}%</span>
              </div>
              <Progress value={Math.min(100, Math.round((totalInProgress / activeSprint.capacity) * 100))} className="h-1.5" />
            </div>
          )}
        </Card>
      )}

      <Tabs defaultValue="agents">
        <TabsList className="mb-4">
          <TabsTrigger value="agents">Agent Utilization</TabsTrigger>
          <TabsTrigger value="sprints">Sprint History</TabsTrigger>
          {report && <TabsTrigger value="report">AI Report</TabsTrigger>}
        </TabsList>

        <TabsContent value="agents">
          <div className="space-y-2">
            {agentRows.map(a => (
              <Card key={a.id} className="p-4 border border-border/60">
                <div className="flex items-start gap-4">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0" style={{ background: a.avatar_color || "#6366f1" }}>
                    {(a.name || "A")[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold">{a.name}</p>
                        <Badge variant="outline" className={`text-[9px] ${a.status === "active" ? "text-emerald-700 border-emerald-300" : a.status === "idle" ? "text-slate-500 border-slate-200" : "text-red-600 border-red-200"}`}>{a.status}</Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-shrink-0">
                        <span className="text-amber-600 font-medium">{a.queued} queued</span>
                        <span className="text-blue-600 font-medium">{a.inProg} running</span>
                        <span className="text-emerald-600 font-medium">{a.done} done</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`h-2 rounded-full flex-1 overflow-hidden bg-muted`}>
                        <div className={`h-full rounded-full transition-all ${a.load > 10 ? "bg-red-400" : a.load > 5 ? "bg-amber-400" : a.load > 0 ? "bg-emerald-400" : "bg-slate-200"}`} style={{ width: `${Math.min(100, a.load * 10)}%` }} />
                      </div>
                      <span className="text-[10px] text-muted-foreground w-14">{a.load} tasks load</span>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="sprints">
          {sprints.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">No sprints recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {sprints.map(s => {
                const sprintTasks = agentTasks.filter(t => t.sprint_id === s.id);
                const done = sprintTasks.filter(t => t.status === "completed").length;
                return (
                  <Card key={s.id} className="p-4 border border-border/60">
                    <div className="flex items-start justify-between gap-2 flex-wrap mb-2">
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <Badge className={`text-[9px] ${s.status === "active" ? "bg-emerald-100 text-emerald-700" : s.status === "completed" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"}`}>{s.status}</Badge>
                          <p className="text-sm font-semibold">{s.name}</p>
                        </div>
                        {s.goal && <p className="text-xs text-muted-foreground">{s.goal}</p>}
                      </div>
                      <p className="text-xs text-muted-foreground">{s.start_date} → {s.end_date}</p>
                    </div>
                    {s.capacity > 0 && <p className="text-xs text-muted-foreground">Capacity: {s.capacity}h · Velocity: {s.velocity || 0} tasks</p>}
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {report && (
          <TabsContent value="report">
            <div className="space-y-4">
              <Card className="p-4 border border-border/60">
                <p className="text-xs font-bold text-muted-foreground uppercase mb-2">Capacity Summary</p>
                <p className="text-sm">{report.capacity_summary}</p>
              </Card>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(report.bottlenecks || []).length > 0 && (
                  <Card className="p-4 border border-red-200 bg-red-50">
                    <p className="text-xs font-bold text-red-700 uppercase mb-2 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" />Bottlenecks</p>
                    <ul className="space-y-1">{report.bottlenecks.map((b, i) => <li key={i} className="text-sm text-red-800 flex items-start gap-1.5"><span>•</span>{b}</li>)}</ul>
                  </Card>
                )}
                {(report.recommended_next_sprint_focus || []).length > 0 && (
                  <Card className="p-4 border border-emerald-200 bg-emerald-50">
                    <p className="text-xs font-bold text-emerald-700 uppercase mb-2 flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5" />Next Sprint Focus</p>
                    <ul className="space-y-1">{report.recommended_next_sprint_focus.map((f, i) => <li key={i} className="text-sm text-emerald-800 flex items-start gap-1.5"><span>→</span>{f}</li>)}</ul>
                  </Card>
                )}
                {(report.hiring_gaps || []).length > 0 && (
                  <Card className="p-4 border border-amber-200 bg-amber-50">
                    <p className="text-xs font-bold text-amber-700 uppercase mb-2">Capability Gaps</p>
                    <ul className="space-y-1">{report.hiring_gaps.map((h, i) => <li key={i} className="text-sm text-amber-800 flex items-start gap-1.5"><span>+</span>{h}</li>)}</ul>
                  </Card>
                )}
                {(report.underutilized_agents || []).length > 0 && (
                  <Card className="p-4 border border-blue-200 bg-blue-50">
                    <p className="text-xs font-bold text-blue-700 uppercase mb-2">Underutilized Agents</p>
                    <div className="flex flex-wrap gap-1.5">{report.underutilized_agents.map(a => <Badge key={a} className="text-xs bg-white text-blue-700 border border-blue-300">{a}</Badge>)}</div>
                  </Card>
                )}
              </div>
              {report.velocity_estimate && (
                <Card className="p-4 border border-border/60">
                  <div className="flex items-center gap-3">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    <div>
                      <p className="text-xs text-muted-foreground">Estimated Velocity</p>
                      <p className="text-xl font-bold">{report.velocity_estimate} tasks/week</p>
                    </div>
                    <div className="ml-auto text-right">
                      <p className="text-xs text-muted-foreground">Sprint Feasibility</p>
                      <p className="text-sm font-semibold">{report.sprint_feasibility}</p>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}